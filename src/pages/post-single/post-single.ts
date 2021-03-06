import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, LoadingController } from 'ionic-angular';
import { PostsRes } from 'models/models';
import { postSinglePage } from './post-single.template';
import { AuthorProfilePage } from '../../pages/author-profile/author-profile';
import { SteemiaProvider } from 'providers/steemia/steemia';
import { SteeemActionsProvider } from 'providers/steeem-actions/steeem-actions';
import { SteemConnectProvider } from 'providers/steemconnect/steemconnect';
import { Subject } from 'rxjs/Subject';
import { AlertsProvider } from 'providers/alerts/alerts';
import { ERRORS } from '../../constants/constants';
import { UtilProvider } from 'providers/util/util';

@IonicPage({
  priority: 'high'
})
@Component({
  selector: 'page-post-single',
  template: postSinglePage
})
export class PostSinglePage {

  private post: any;
  private is_voting: boolean = false;
  private comments: Array<any> = [];
  private is_loading: boolean = true;
  private is_logged_in: boolean = false;
  private profile: any;
  private current_user: string = "";
  private user;
  private chatBox: string = '';


  private ngUnsubscribe: Subject<any> = new Subject();

  constructor(private zone: NgZone,
    private cdr: ChangeDetectorRef,
    public navCtrl: NavController,
    public navParams: NavParams,
    private steemia: SteemiaProvider,
    private alerts: AlertsProvider,
    public util: UtilProvider,
    public loadingCtrl: LoadingController,
    private steemActions: SteeemActionsProvider,
    private steemConnect: SteemConnectProvider) { 
      this.user = (this.steemConnect.user_temp as any);
    }

  ionViewDidLoad() {
    this.post = this.navParams.get('post');
    this.current_user = (this.steemConnect.user_temp as any).user;
    

    this.zone.runOutsideAngular(() => {
      this.load_comments();
    });

  }

  ionViewDidLeave() {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private load_comments(action?: string) {
    this.steemia.dispatch_comments({
      permlink: encodeURIComponent(this.post.url),
      username: this.current_user
    }).then((comments: PostsRes) => {

      // Check if the action is to refresh. If so, we need to 
      // reinitialize all the data after initializing the query
      // to avoid the data to dissapear
      if (action === "refresh") {
        this.reinitialize();
      }
      this.comments = comments.results.reverse();;

      // Set the loading spinner to false
      this.is_loading = false

      // Tell Angular that changes were made since we detach the auto check
      this.cdr.detectChanges();
    });
  }

  private reinitialize() {
    this.comments = [];
  }

  /**
   * Method to open author profile page
   */
  private openProfile(): void {
    this.navCtrl.push(AuthorProfilePage, {
      author: this.post.author
    });
  }

  /**
   * Method to cast a vote or unvote
   * @param i 
   * @param author 
   * @param permlink 
   * @param weight 
   */
  private castVote(author: string, permlink: string, weight: number = 1000): void {
    // Set the is voting value of the post to true
    this.is_voting = true;

    this.steemActions.dispatch_vote('post', author, permlink, weight).then(data => {
      if (data) {

        // Catch if the user is not logged in and display an alert
        if (data === 'not-logged') {
          this.alerts.display_alert('NOT_LOGGED_IN');
          this.is_voting = false; // remove the spinner
          return;
        }

        this.is_voting = false;

        if (weight > 0) {
          this.post.vote = true;
        }

        else {
          this.post.vote = false;
        }

        //this.refreshPost();
      }
    }).catch(err => { console.log(err); this.is_voting = false });
  }

  private reblog() {

    let loading = this.loadingCtrl.create({
      content: 'Hang on while we reblog this post 😎'
    });
    loading.present();
    this.steemActions.dispatch_reblog(this.post.author, this.post.url).then(data => {

      // Catch if the user is not logged in and display an alert
      if (data === 'not-logged') {
        this.show_prompt(loading, 'NOT_LOGGED_IN');
        return;
      }

      if (data === 'Correct') {
        this.show_prompt(loading, 'REBLOGGED_CORRECTLY');
      }

      if (data === 'ALREADY_REBLOGGED') {
        this.show_prompt(loading, 'ALREADY_REBLOGGED');
      }

    });
  }

  private show_prompt(loader, msg) {
    loader.dismiss();
    setTimeout(() => {
      this.alerts.display_alert(msg);
    }, 500);
  }

  private share() {
    this.steemActions.dispatch_share(this.post.url).then(res => {
      console.log(res)
    })
  }

  /**
   * Dispatch a comment to the current post
   */
  private comment() {
    if (this.chatBox.length === 0) {
      this.alerts.display_alert('EMPTY_TEXT');
      return;
    }

    let loading = this.loadingCtrl.create({
      content: 'Please wait...'
    });
    loading.present();
    this.steemActions.dispatch_comment(this.post.author, this.post.url, this.chatBox).then(res => {
      console.log(res)
      if (res === 'not-logged') {
        this.show_prompt(loading, 'NOT_LOGGED_IN');
        return;
      }

      else if (res === 'Correct') {
        this.chatBox = '';
        this.zone.runOutsideAngular(() => {
          this.load_comments('refresh');
        });
        loading.dismiss();
      }
      
      else if (res === 'COMMENT_INTERVAL') {
        this.show_prompt(loading, 'COMMENT_INTERVAL');
      }

    });
  }

}
